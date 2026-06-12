"use client";

import { Clear } from "./Clear";
import { Filter } from "./Filter";

import { ActiveFilteredUser } from "./activeFilteredUsersAndTags/ActiveFilteredUser";

import { ActiveFilteredTag } from "./activeFilteredUsersAndTags/ActiveFilteredTag";
import { useFilterByUsersAndTagsInWorkspace } from "@/context/FilterByUsersAndTagsInWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface Props {
  sessionUserId: string;
}

export const FilterContainer = ({ sessionUserId }: Props) => {
  const { filterAssignedUsers, filterTags } =
    useFilterByUsersAndTagsInWorkspace();
  const t = useTranslations("WORKSPACE_MAIN_PAGE.FILTER");

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-bold">{t("TITLE")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full flex-wrap gap-2">
          <Filter sessionUserId={sessionUserId} />
          {filterAssignedUsers.map((user) => (
            <ActiveFilteredUser
              key={user.id}
              id={user.id}
              image={user.image}
              username={user.username}
            />
          ))}
          {filterTags.map((tag) => (
            <ActiveFilteredTag tag={tag} key={tag.id} />
          ))}
          {(filterAssignedUsers.length > 0 || filterTags.length > 0) && <Clear />}
        </div>
      </CardContent>
    </Card>
  );
};
