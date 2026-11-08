import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { parseIdeaSearch, serializeIdeaSearch } from "../../core/ideas";
import { CalendarScreen } from "../../features/calendar/CalendarScreen";
import { EditorScreen } from "../../features/editor/EditorScreen";
import { IdeasScreen } from "../../features/ideas/IdeasScreen";
import { PublishedScreen } from "../../features/published/PublishedScreen";
import { SeriesScreen } from "../../features/series/SeriesScreen";
import { AppShell } from "../layout/AppShell";

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
  validateSearch: (raw: Record<string, unknown>) => serializeIdeaSearch(parseIdeaSearch(raw)),
  component: IdeasScreen,
});
const ideaRoute = createRoute({
  getParentRoute: () => ideasRoute,
  path: "$id",
  component: function IdeaScreen() {
    const { id } = ideaRoute.useParams();
    return <EditorScreen key={id} ideaId={id} />;
  },
});
const seriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "series/$id",
  component: function SeriesRoute() {
    const { id } = seriesRoute.useParams();
    return <SeriesScreen key={id} seriesId={id} />;
  },
});
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "calendar",
  component: CalendarScreen,
});
const publishedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "published",
  component: PublishedScreen,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  ideasRoute.addChildren([ideasIndexRoute, ideaRoute]),
  seriesRoute,
  calendarRoute,
  publishedRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
