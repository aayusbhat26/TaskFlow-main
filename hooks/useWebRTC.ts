import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface PeerMediaState {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

/**
 * Custom WebRTC hook for peer-to-peer audio/video.
 *
 * Handshake flow:
 * 1. Each user acquires local media, then emits "rtc-ready".
 * 2. When a peer's "rtc-ready" arrives, we compare user IDs.
 *    The user with the LOWER id is the "offerer"; the other waits.
 * 3. This prevents the glare condition where both sides send offers.
 */
export function useWebRTC(socket: Socket | null, roomKey: string, currentUserId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerStates, setPeerStates] = useState<Record<string, PeerMediaState>>({});

  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const readyPeers = useRef<Set<string>>(new Set());

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // ---- Create a PeerConnection for a given peer ----
  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    // Close any existing connection for this peer
    if (peerConnections.current[peerId]) {
      try { peerConnections.current[peerId].close(); } catch {}
    }

    console.log(`[WebRTC] Creating PC for peer ${peerId}`);
    const pc = new RTCPeerConnection(config);

    // Attach local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`[WebRTC]   Adding local ${track.kind} track to PC`);
        pc.addTrack(track, stream);
      });
      if (!stream.getVideoTracks().length) {
         pc.addTransceiver('video', { direction: 'sendrecv', streams: [stream] });
      }
    } else {
      console.warn(`[WebRTC]   No local stream when creating PC for ${peerId}`);
    }

    // Forward ICE candidates to peer via socket
    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef.current) {
        socketRef.current.emit("rtc-ice-candidate", {
          targetUserId: peerId,
          senderUserId: currentUserId,
          candidate: ev.candidate.toJSON(),
          room: roomKey,
        });
      }
    };

    // Receive remote tracks
    pc.ontrack = (ev) => {
      console.log(`[WebRTC] Got remote ${ev.track.kind} track from ${peerId}`);
      const [rs] = ev.streams;
      if (rs) {
        setRemoteStreams(prev => ({ ...prev, [peerId]: rs }));
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`[WebRTC] PC ${peerId} connectionState: ${s}`);
      if (s === 'failed' || s === 'closed') {
        cleanUpPeer(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] PC ${peerId} iceState: ${pc.iceConnectionState}`);
    };

    peerConnections.current[peerId] = pc;
    return pc;
  }, [currentUserId, roomKey]);

  const cleanUpPeer = useCallback((peerId: string) => {
    const pc = peerConnections.current[peerId];
    if (pc) { try { pc.close(); } catch {} }
    delete peerConnections.current[peerId];
    delete pendingCandidates.current[peerId];
    readyPeers.current.delete(peerId);
    setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n; });
    setPeerStates(prev => { const n = { ...prev }; delete n[peerId]; return n; });
  }, []);

  const flushCandidates = useCallback(async (peerId: string) => {
    const pc = peerConnections.current[peerId];
    const q = pendingCandidates.current[peerId];
    if (pc && q && q.length > 0) {
      console.log(`[WebRTC] Flushing ${q.length} queued ICE candidates for ${peerId}`);
      for (const c of q) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.error(e); }
      }
      pendingCandidates.current[peerId] = [];
    }
  }, []);

  // ---- Initiate an offer to a specific peer ----
  const sendOfferTo = useCallback(async (peerId: string) => {
    if (!socketRef.current || !localStreamRef.current) return;

    console.log(`[WebRTC] Sending offer to ${peerId}`);
    const pc = createPC(peerId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("rtc-offer", {
        targetUserId: peerId,
        callerUserId: currentUserId,
        sdp: pc.localDescription!.toJSON(),
        room: roomKey,
      });
    } catch (err) {
      console.error("[WebRTC] Error creating offer:", err);
    }
  }, [createPC, currentUserId, roomKey]);

  // ---- Step 1: Acquire local media ----
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        // Start muted
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        
        const newStream = new MediaStream(stream.getTracks());
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        console.log("[WebRTC] ✅ Local media acquired (audio only)");
      } catch (err) {
        console.error("[WebRTC] ❌ No media devices available:", err);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // ---- Step 2: Once local stream is ready, announce "rtc-ready" ----
  useEffect(() => {
    if (!socket || !localStream) return;

    console.log("[WebRTC] Local stream ready, emitting rtc-ready");
    socket.emit("rtc-ready", { userId: currentUserId, room: roomKey });

    // Also send offers to any peers that already announced ready before us
    readyPeers.current.forEach(peerId => {
      if (currentUserId < peerId) {
        sendOfferTo(peerId);
      }
    });
  }, [socket, localStream, currentUserId, roomKey, sendOfferTo]);

  // ---- Step 3: Set up all signaling listeners (not gated on localStream) ----
  useEffect(() => {
    if (!socket) return;

    console.log("[WebRTC] Registering signaling listeners");

    // When a peer announces they are ready
    const handleRtcReady = (data: { userId: string }) => {
      if (data.userId === currentUserId) return;

      console.log(`[WebRTC] Peer ${data.userId} is rtc-ready`);
      readyPeers.current.add(data.userId);

      // Only the user with the LOWER id creates the offer (prevents glare)
      if (localStreamRef.current && currentUserId < data.userId) {
        console.log(`[WebRTC] I'm the offerer (my id < their id)`);
        sendOfferTo(data.userId);
      } else if (!localStreamRef.current) {
        console.log(`[WebRTC] My stream isn't ready yet, will offer later`);
      } else {
        console.log(`[WebRTC] I'm the answerer (my id > their id), waiting for offer`);
      }
    };

    // Receive offer
    const handleOffer = async (data: { targetUserId: string; callerUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (data.targetUserId !== currentUserId) return;
      if (!localStreamRef.current) {
        console.warn("[WebRTC] Received offer but local stream not ready, ignoring");
        return;
      }

      console.log(`[WebRTC] Received offer from ${data.callerUserId}`);
      const pc = createPC(data.callerUserId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushCandidates(data.callerUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("rtc-answer", {
          targetUserId: data.callerUserId,
          callerUserId: currentUserId,
          sdp: pc.localDescription!.toJSON(),
          room: roomKey,
        });
        console.log(`[WebRTC] Sent answer to ${data.callerUserId}`);
      } catch (err) {
        console.error("[WebRTC] Error handling offer:", err);
      }
    };

    // Receive answer
    const handleAnswer = async (data: { targetUserId: string; callerUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (data.targetUserId !== currentUserId) return;

      console.log(`[WebRTC] Received answer from ${data.callerUserId}`);
      const pc = peerConnections.current[data.callerUserId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushCandidates(data.callerUserId);
          console.log(`[WebRTC] Remote description set for ${data.callerUserId}`);
        } catch (err) {
          console.error("[WebRTC] Error setting remote description:", err);
        }
      }
    };

    // Receive ICE candidate
    const handleIce = async (data: { targetUserId: string; senderUserId: string; candidate: RTCIceCandidateInit }) => {
      if (data.targetUserId !== currentUserId) return;

      const pc = peerConnections.current[data.senderUserId];
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("[WebRTC] Error adding ICE:", err);
        }
      } else {
        if (!pendingCandidates.current[data.senderUserId]) {
          pendingCandidates.current[data.senderUserId] = [];
        }
        pendingCandidates.current[data.senderUserId].push(data.candidate);
      }
    };

    // Peer media state changes
    const handleMediaState = (data: { userId: string; isMuted: boolean; isVideoOn: boolean; isScreenSharing: boolean }) => {
      if (data.userId === currentUserId) return;
      setPeerStates(prev => ({
        ...prev,
        [data.userId]: { isMuted: data.isMuted, isVideoOn: data.isVideoOn, isScreenSharing: data.isScreenSharing }
      }));
    };

    // Peer left
    const handleLeft = (data: { userId: string }) => {
      if (data.userId === currentUserId) return;
      console.log(`[WebRTC] Peer ${data.userId} left`);
      cleanUpPeer(data.userId);
    };

    socket.on("rtc-ready", handleRtcReady);
    socket.on("rtc-offer", handleOffer);
    socket.on("rtc-answer", handleAnswer);
    socket.on("rtc-ice-candidate", handleIce);
    socket.on("media-state-change", handleMediaState);
    socket.on("user-left-media", handleLeft);

    return () => {
      socket.off("rtc-ready", handleRtcReady);
      socket.off("rtc-offer", handleOffer);
      socket.off("rtc-answer", handleAnswer);
      socket.off("rtc-ice-candidate", handleIce);
      socket.off("media-state-change", handleMediaState);
      socket.off("user-left-media", handleLeft);
    };
  }, [socket, currentUserId, roomKey, createPC, sendOfferTo, cleanUpPeer, flushCandidates]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      Object.values(peerConnections.current).forEach(pc => { try { pc.close(); } catch {} });
      peerConnections.current = {};
      pendingCandidates.current = {};
      readyPeers.current.clear();
    };
  }, []);

  // ---- Media toggle controls ----
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newMuted = !isMuted;
    stream.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    setIsMuted(newMuted);

    socketRef.current?.emit("media-state-change", {
      userId: currentUserId, isMuted: newMuted, isVideoOn, isScreenSharing, room: roomKey,
    });
  }, [isMuted, isVideoOn, isScreenSharing, currentUserId, roomKey]);

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (isVideoOn) {
      stream.getVideoTracks().forEach(t => {
        t.stop();
        stream.removeTrack(t);
      });

      const pcs = Object.values(peerConnections.current);
      for (const pc of pcs) {
        const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
        if (transceiver && transceiver.sender) {
          transceiver.sender.replaceTrack(null);
        }
      }

      const newStream = new MediaStream(stream.getTracks());
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      setIsVideoOn(false);

      socketRef.current?.emit("media-state-change", {
        userId: currentUserId, isMuted, isVideoOn: false, isScreenSharing, room: roomKey,
      });
    } else {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = camStream.getVideoTracks()[0];
        stream.addTrack(newVideoTrack);

        const pcs = Object.values(peerConnections.current);
        for (const pc of pcs) {
          const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
          if (transceiver && transceiver.sender) {
             await transceiver.sender.replaceTrack(newVideoTrack);
          }
        }

        const newStream = new MediaStream(stream.getTracks());
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        setIsVideoOn(true);

        socketRef.current?.emit("media-state-change", {
          userId: currentUserId, isMuted, isVideoOn: true, isScreenSharing, room: roomKey,
        });
      } catch (err) {
        console.error("[WebRTC] Failed to re-acquire camera", err);
      }
    }
  }, [isMuted, isVideoOn, isScreenSharing, currentUserId, roomKey]);

  const wasVideoOnBeforeScreenShareRef = useRef<boolean>(false);

  const stopScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    try {
      const screenTrack = stream.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.stop();
        stream.removeTrack(screenTrack);
      }

      let newCamTrack = null;
      if (wasVideoOnBeforeScreenShareRef.current) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          newCamTrack = camStream.getVideoTracks()[0];
          stream.addTrack(newCamTrack);
        } catch (e) {
          console.error("[WebRTC] Failed to restore camera", e);
        }
      }

      const pcs = Object.values(peerConnections.current);
      for (const pc of pcs) {
        const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
        if (transceiver && transceiver.sender) {
          await transceiver.sender.replaceTrack(newCamTrack);
        }
      }

      const newStream = new MediaStream(stream.getTracks());
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      
      const resumingVideo = !!newCamTrack;
      setIsScreenSharing(false);
      setIsVideoOn(resumingVideo);

      socketRef.current?.emit("media-state-change", {
        userId: currentUserId, isMuted, isVideoOn: resumingVideo, isScreenSharing: false, room: roomKey,
      });
    } catch (err) {
      console.error("[WebRTC] Error stopping screen share:", err);
      setIsScreenSharing(false);
    }
  }, [isMuted, currentUserId, roomKey]);

  const toggleScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];

        wasVideoOnBeforeScreenShareRef.current = isVideoOn;
        const oldVideoTrack = stream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          stream.removeTrack(oldVideoTrack);
        }
        stream.addTrack(screenTrack);

        const pcs = Object.values(peerConnections.current);
        for (const pc of pcs) {
          const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
          if (transceiver && transceiver.sender) {
            await transceiver.sender.replaceTrack(screenTrack);
          }
        }

        const newStream = new MediaStream(stream.getTracks());
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        setIsScreenSharing(true);
        setIsVideoOn(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };

        socketRef.current?.emit("media-state-change", {
          userId: currentUserId, isMuted, isVideoOn: true, isScreenSharing: true, room: roomKey,
        });
      } catch (err) {
        console.error("[WebRTC] Screen share failed:", err);
      }
    } else {
      await stopScreenShare();
    }
  }, [isScreenSharing, isVideoOn, isMuted, currentUserId, roomKey, stopScreenShare]);

  return {
    localStream, remoteStreams, peerStates,
    isMuted, isVideoOn, isScreenSharing,
    toggleMute, toggleVideo, toggleScreenShare,
  };
}
