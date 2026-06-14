"use client";

import { UserSettings, CompletionSoundEffect } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/loadingState";
import { useState, useCallback } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { Howl } from "howler";
import { useSoundSettings } from "@/hooks/useSoundSettings";

// Sound effect mapping
const soundEffectPaths: Record<CompletionSoundEffect, string> = {
  SUCCESS: "/sounds/bell.mp3",
  ACHIEVEMENT: "/sounds/fancy.mp3",
  TASK_COMPLETE: "/sounds/digital.mp3",
  QUESTION_COMPLETE: "/sounds/analog.mp3",
  BELL: "/sounds/bell.mp3",
  DIGITAL: "/sounds/digital.mp3",
  BIRD: "/sounds/bird.mp3",
  FANCY: "/sounds/fancy.mp3",
  ANALOG: "/sounds/analog.mp3",
  CHURCH_BELL: "/sounds/churchBell.mp3",
};

// Schema for form validation
const soundSettingsSchema = z.object({
  soundsEnabled: z.boolean(),
  soundVolume: z.number().min(0).max(100),
  taskCompletionSound: z.string(),
  questionCompletionSound: z.string(),
});

type SoundSettingsSchema = z.infer<typeof soundSettingsSchema>;

interface Props {
  userSettings: UserSettings;
}

export const SoundSettingsForm = ({ userSettings }: Props) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const { updateSettings: updateLocalSettings } = useSoundSettings();
  const form = useForm<SoundSettingsSchema>({
    resolver: zodResolver(soundSettingsSchema),
    defaultValues: {
      soundsEnabled: userSettings.soundsEnabled,
      soundVolume: userSettings.soundVolume * 100,
      taskCompletionSound: userSettings.taskCompletionSound,
      questionCompletionSound: userSettings.questionCompletionSound,
    },
  });

  const { toast } = useToast();
  const t = useTranslations("SETTINGS.SOUND");
  const m = useTranslations("MESSAGES");
  const router = useRouter();

  // Play sound effect function
  const playSoundEffect = useCallback((soundEffect: CompletionSoundEffect, volume: number) => {
    if (isPlaying) return; // Prevent multiple sounds playing simultaneously
    
    const soundPath = soundEffectPaths[soundEffect];
    if (!soundPath) {
      console.error('Sound path not found:', soundEffect);
      return;
    }

    console.log('Playing sound:', soundEffect, 'at path:', soundPath, 'volume:', volume);
    setIsPlaying(soundEffect);
    
    const sound = new Howl({
      src: [soundPath],
      volume: volume / 100,
      onload: () => {
        console.log('Sound loaded successfully:', soundEffect);
      },
      onend: () => {
        console.log('Sound ended:', soundEffect);
        setIsPlaying(null);
      },
      onloaderror: (id, error) => {
        console.error('Sound load error:', soundEffect, error);
        setIsPlaying(null);
        toast({
          title: m("ERRORS.SOUND_LOAD_ERROR"),
          variant: "destructive",
        });
      },
      onplayerror: (id, error) => {
        console.error('Sound play error:', soundEffect, error);
        setIsPlaying(null);
        toast({
          title: m("ERRORS.SOUND_LOAD_ERROR"),
          variant: "destructive",
        });
      },
    });

    sound.play();
  }, [isPlaying, toast, m]);

  // Update settings mutation
  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (formData: SoundSettingsSchema) => {
      await axios.post("/api/settings/sound/update", formData);
      return formData;
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data ? err.response.data : "ERRORS_DEFAULT";
      toast({
        title: m(error),
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      // Update localStorage with the new settings
      updateLocalSettings({
        soundsEnabled: data.soundsEnabled,
        soundVolume: data.soundVolume / 100,
        taskCompletionSound: data.taskCompletionSound,
        questionCompletionSound: data.questionCompletionSound,
      });
      
      toast({
        title: m("SUCCESS.SOUND_SETTINGS_UPDATED"),
      });
      router.refresh();
    },
  });

  const onSubmit = (data: SoundSettingsSchema) => {
    updateSettings(data);
  };

  const currentVolume = form.watch("soundVolume");
  const soundsEnabled = form.watch("soundsEnabled");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            {t("TITLE")}
          </CardTitle>
          <CardDescription>
            {t("DESCRIPTION")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Enable/Disable Sounds */}
              <FormField
                control={form.control}
                name="soundsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t("ENABLE_SOUNDS.LABEL")}
                      </FormLabel>
                      <FormDescription>
                        {t("ENABLE_SOUNDS.DESCRIPTION")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Sound Volume */}
              <FormField
                control={form.control}
                name="soundVolume"
                render={({ field: { value, onChange } }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="flex items-center gap-2">
                      {soundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      {t("VOLUME.LABEL", { value })}
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[value]}
                        onValueChange={(vals) => onChange(vals[0])}
                        disabled={!soundsEnabled}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("VOLUME.DESCRIPTION")}
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Task Completion Sound */}
              <FormField
                control={form.control}
                name="taskCompletionSound"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>{t("TASK_SOUND.LABEL")}</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!soundsEnabled}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("TASK_SOUND.PLACEHOLDER")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(soundEffectPaths).map(([key, path]) => (
                            <SelectItem key={key} value={key}>
                              {t(`SOUND_EFFECTS.${key}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => playSoundEffect(field.value as CompletionSoundEffect, currentVolume)}
                        disabled={!soundsEnabled || isPlaying === field.value}
                      >
                        {isPlaying === field.value ? (
                          <LoadingState />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormDescription>
                      {t("TASK_SOUND.DESCRIPTION")}
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Question Completion Sound */}
              <FormField
                control={form.control}
                name="questionCompletionSound"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>{t("QUESTION_SOUND.LABEL")}</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!soundsEnabled}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("QUESTION_SOUND.PLACEHOLDER")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(soundEffectPaths).map(([key, path]) => (
                            <SelectItem key={key} value={key}>
                              {t(`SOUND_EFFECTS.${key}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => playSoundEffect(field.value as CompletionSoundEffect, currentVolume)}
                        disabled={!soundsEnabled || isPlaying === field.value}
                      >
                        {isPlaying === field.value ? (
                          <LoadingState />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormDescription>
                      {t("QUESTION_SOUND.DESCRIPTION")}
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Save Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <LoadingState />
                      {t("SAVE.PENDING")}
                    </>
                  ) : (
                    t("SAVE.BUTTON")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
