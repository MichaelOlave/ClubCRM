"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminApiHeaders } from "@/lib/api/adminAuthHeaders";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import {
  createAnnouncementApi,
  createClubApi,
  createClubManagerGrantApi,
  createEventApi,
  deleteAnnouncementApi,
  deleteClubManagerGrantApi,
  deleteEventApi,
  updateAnnouncementApi,
  updateClubApi,
  updateEventApi,
} from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import { buildPathWithSearchParams, getOptionalString, getRequiredString } from "@/lib/forms";

const DESCRIPTION_MAX_LENGTH = 500;

function getClubDetailPath(clubSlugOrId: string): string {
  return `/clubs/${clubSlugOrId}`;
}

function getClubRouteSlug(formData: FormData, clubId: string): string {
  return getOptionalString(formData, "clubSlug") ?? clubId;
}

function hasInvalidEventRange(startsAt: string, endsAt: string | null): boolean {
  return Boolean(endsAt && startsAt >= endsAt);
}

function validateDescriptionLength(
  description: string,
  {
    fieldLabel,
    errorSearchParam,
    redirectPath,
    extraSearchParams,
  }: {
    fieldLabel: string;
    errorSearchParam: string;
    redirectPath: string;
    extraSearchParams?: Record<string, string>;
  }
): void {
  if (description.length <= DESCRIPTION_MAX_LENGTH) {
    return;
  }

  redirect(
    buildPathWithSearchParams(redirectPath, {
      ...extraSearchParams,
      [errorSearchParam]: `${fieldLabel} must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    })
  );
}

export async function createClubAction(formData: FormData) {
  const session = await requireOrgAdminBackendSession("/clubs");
  const name = getRequiredString(formData, "name", "Club name");
  const status = getRequiredString(formData, "status", "Club status");
  const description = getOptionalString(formData, "description") ?? "";
  let successRedirectPath = "/clubs";

  validateDescriptionLength(description, {
    fieldLabel: "Club description",
    errorSearchParam: "clubError",
    redirectPath: "/clubs",
  });

  try {
    const club = await createClubApi(
      {
        organization_id: session.access.organizationId,
        name,
        description,
        status,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: "/clubs" }),
      }
    );

    revalidatePath("/clubs");
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams("/clubs", {
      clubCreated: `${club.name} is ready for member assignments.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams("/clubs", {
        clubError: getApiErrorMessage(error, "The club could not be created right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function updateClubAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const name = getRequiredString(formData, "name", "Club name");
  const status = getRequiredString(formData, "status", "Club status");
  const description = getOptionalString(formData, "description") ?? "";
  const currentDetailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = currentDetailPath;

  validateDescriptionLength(description, {
    fieldLabel: "Club description",
    errorSearchParam: "clubUpdateError",
    redirectPath: currentDetailPath,
  });

  try {
    const club = await updateClubApi(
      clubId,
      {
        name,
        description,
        status,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: currentDetailPath }),
      }
    );

    const nextDetailPath = getClubDetailPath(club.slug);
    revalidatePath("/clubs");
    revalidatePath(currentDetailPath);
    revalidatePath(nextDetailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(nextDetailPath, {
      clubUpdated: `${club.name} has been updated.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(currentDetailPath, {
        clubUpdateError: getApiErrorMessage(error, "The club could not be updated right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function createClubManagerGrantAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const memberId = getRequiredString(formData, "memberId", "Member");
  const roleName = getRequiredString(formData, "roleName", "Manager title");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  try {
    const grant = await createClubManagerGrantApi(
      clubId,
      {
        member_id: memberId,
        role_name: roleName,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      managerGrantCreated: `${grant.member_name} can now manage this club as ${grant.role_name}.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        managerGrantError: getApiErrorMessage(
          error,
          "The club manager grant could not be created right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function deleteClubManagerGrantAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const grantId = getRequiredString(formData, "grantId", "Manager grant");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  try {
    await deleteClubManagerGrantApi(clubId, grantId, {
      headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
    });

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      managerGrantDeleted: "Club manager access has been revoked.",
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        managerGrantError: getApiErrorMessage(
          error,
          "The club manager grant could not be removed right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function createEventAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const title = getRequiredString(formData, "title", "Event title");
  const description = getRequiredString(formData, "description", "Description");
  const startsAt = getRequiredString(formData, "startsAt", "Start time");
  const endsAt = getOptionalString(formData, "endsAt");
  const location = getOptionalString(formData, "location");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  validateDescriptionLength(description, {
    fieldLabel: "Event description",
    errorSearchParam: "eventCreateError",
    redirectPath: detailPath,
  });

  if (hasInvalidEventRange(startsAt, endsAt)) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        eventCreateError: "Event end time must be after the start time.",
      })
    );
  }

  try {
    const event = await createEventApi(
      {
        club_id: clubId,
        title,
        description,
        starts_at: startsAt,
        location,
        ends_at: endsAt,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      eventCreated: `${event.title} has been added to the club schedule.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        eventCreateError: getApiErrorMessage(error, "The event could not be created right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function updateEventAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const eventId = getRequiredString(formData, "eventId", "Event");
  const title = getRequiredString(formData, "title", "Event title");
  const description = getRequiredString(formData, "description", "Description");
  const startsAt = getRequiredString(formData, "startsAt", "Start time");
  const endsAt = getOptionalString(formData, "endsAt");
  const location = getOptionalString(formData, "location");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  validateDescriptionLength(description, {
    fieldLabel: "Event description",
    errorSearchParam: "eventUpdateError",
    redirectPath: detailPath,
    extraSearchParams: { eventEditTarget: eventId },
  });

  if (hasInvalidEventRange(startsAt, endsAt)) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        eventUpdateError: "Event end time must be after the start time.",
        eventEditTarget: eventId,
      })
    );
  }

  try {
    const event = await updateEventApi(
      eventId,
      {
        title,
        description,
        starts_at: startsAt,
        location,
        ends_at: endsAt,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      eventUpdated: `${event.title} has been updated.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        eventUpdateError: getApiErrorMessage(error, "The event could not be updated right now."),
        eventEditTarget: eventId,
      })
    );
  }

  redirect(successRedirectPath);
}

export async function deleteEventAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const eventId = getRequiredString(formData, "eventId", "Event");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  try {
    await deleteEventApi(eventId, {
      headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
    });

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      eventDeleted: "The event has been removed from the club schedule.",
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        eventDeleteError: getApiErrorMessage(error, "The event could not be removed right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function createAnnouncementAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const title = getRequiredString(formData, "title", "Announcement title");
  const body = getRequiredString(formData, "body", "Message");
  const createdBy = getOptionalString(formData, "createdBy");
  const publishedAt = getOptionalString(formData, "publishedAt");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  try {
    const announcement = await createAnnouncementApi(
      {
        club_id: clubId,
        title,
        body,
        created_by: createdBy,
        published_at: publishedAt,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      announcementCreated: `${announcement.title} has been saved.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        announcementCreateError: getApiErrorMessage(
          error,
          "The announcement could not be created right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function updateAnnouncementAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const announcementId = getRequiredString(formData, "announcementId", "Announcement");
  const title = getRequiredString(formData, "title", "Announcement title");
  const body = getRequiredString(formData, "body", "Message");
  const publishedAt = getRequiredString(formData, "publishedAt", "Publish time");
  const createdBy = getOptionalString(formData, "createdBy");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  try {
    const announcement = await updateAnnouncementApi(
      announcementId,
      {
        title,
        body,
        published_at: publishedAt,
        created_by: createdBy,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      announcementUpdated: `${announcement.title} has been updated.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        announcementUpdateError: getApiErrorMessage(
          error,
          "The announcement could not be updated right now."
        ),
        announcementEditTarget: announcementId,
      })
    );
  }

  redirect(successRedirectPath);
}

export async function deleteAnnouncementAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const clubSlug = getClubRouteSlug(formData, clubId);
  const announcementId = getRequiredString(formData, "announcementId", "Announcement");
  const detailPath = getClubDetailPath(clubSlug);
  let successRedirectPath = detailPath;

  try {
    await deleteAnnouncementApi(announcementId, {
      headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
    });

    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      announcementDeleted: "The announcement has been removed.",
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        announcementDeleteError: getApiErrorMessage(
          error,
          "The announcement could not be removed right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}
