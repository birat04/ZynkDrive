import { FormattedDateTime } from "@/components/FormattedDateTime";
import { getUserActivityFeed } from "@/lib/actions/activity.actions";
import { getActivityDisplayText } from "@/lib/utils/formatting";

type ActivityItem = {
  $id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: { fileName?: string; name?: string };
  createdAt?: string;
};

const ActivityFeed = async () => {
  let activities: ActivityItem[] = [];

  try {
    const feed = await getUserActivityFeed(15);
    activities = (feed?.activities as unknown as ActivityItem[]) || [];
  } catch {
    activities = [];
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-drop-1">
      <h2 className="h5 text-light-100">Recent activity</h2>
      <p className="caption mt-1 text-light-200">Your latest file actions and collaboration updates</p>

      {activities.length === 0 ? (
        <p className="body-2 mt-4 text-light-200">No activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((activity) => {
            const resourceName =
              activity.metadata?.fileName || activity.metadata?.name || activity.resourceId;
            const label = getActivityDisplayText(
              activity.action,
              activity.resourceType,
              resourceName
            );

            return (
              <li
                key={activity.$id}
                className="flex items-start justify-between gap-3 rounded-xl bg-light-400 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-light-100">{label}</p>
                  <p className="caption capitalize text-light-200">{activity.resourceType}</p>
                </div>
                <FormattedDateTime
                  isoString={activity.createdAt}
                  className="caption shrink-0 text-light-200"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ActivityFeed;
