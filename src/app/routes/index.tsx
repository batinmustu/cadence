import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "../layout/AppShell";

function Screen({ titleKey, detail }: { titleKey: string; detail?: string }) {
  const { t } = useTranslation();
  return (
    <section>
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      {detail ? <p className="mt-1 text-text-3">{detail}</p> : null}
    </section>
  );
}

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/ideas" });
  },
});
const ideasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "ideas",
  component: Outlet,
});
const ideasIndexRoute = createRoute({
  getParentRoute: () => ideasRoute,
  path: "/",
  component: () => <Screen titleKey="nav.ideas" />,
});
const ideaRoute = createRoute({
  getParentRoute: () => ideasRoute,
  path: "$id",
  component: function IdeaScreen() {
    const { id } = ideaRoute.useParams();
    return <Screen titleKey="nav.idea" detail={id} />;
  },
});
const seriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "series/$id",
  component: function SeriesScreen() {
    const { id } = seriesRoute.useParams();
    return <Screen titleKey="nav.series" detail={id} />;
  },
});
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "calendar",
  component: () => <Screen titleKey="nav.calendar" />,
});
const publishedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "published",
  component: () => <Screen titleKey="nav.published" />,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: Outlet,
});
const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/",
  component: () => <Screen titleKey="nav.settings" />,
});
const settingsSectionRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "$section",
  component: function SettingsSection() {
    const { section } = settingsSectionRoute.useParams();
    return <Screen titleKey="nav.settings" detail={section} />;
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  ideasRoute.addChildren([ideasIndexRoute, ideaRoute]),
  seriesRoute,
  calendarRoute,
  publishedRoute,
  settingsRoute.addChildren([settingsIndexRoute, settingsSectionRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
