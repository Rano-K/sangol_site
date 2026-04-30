import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { Order } from "./components/Order";
import { Placeholder } from "./components/Placeholder";
import { Login } from "./components/Login";
import { MyPage } from "./components/MyPage";
import { CompanyGreeting } from "./components/CompanyGreeting";

import { CompanyHistory } from "./components/CompanyHistory";
import { CompanyAwards } from "./components/CompanyAwards";
import { CompanyLocation } from "./components/CompanyLocation";
import { BusinessPhilosophy } from "./components/BusinessPhilosophy";
import { BusinessVision } from "./components/BusinessVision";
import { BusinessCompetency } from "./components/BusinessCompetency";
import { BusinessFarm } from "./components/BusinessFarm";
import { Products } from "./components/Products";
import { Support } from "./components/Support";
import { CommunityStory } from "./components/CommunityStory";
import { CommunityConcert } from "./components/CommunityConcert";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "order", Component: Order },
      { path: "login", Component: Login },
      { path: "mypage", Component: MyPage },
      // Company Routes
      { path: "company/greeting", Component: CompanyGreeting },
      { path: "company/history", Component: CompanyHistory },
      { path: "company/awards", Component: CompanyAwards },
      { path: "company/location", Component: CompanyLocation },
      { path: "company/*", Component: Placeholder },
      // Other Routes
      { path: "business/philosophy", Component: BusinessPhilosophy },
      { path: "business/vision", Component: BusinessVision },
      { path: "business/core-competence", Component: BusinessCompetency },
      { path: "business/farm", Component: BusinessFarm },
      { path: "business/*", Component: Placeholder },
      { path: "products", Component: Products },
      { path: "products/:category", Component: Products },
      { path: "support", Component: Support },
      { path: "support/:tab", Component: Support },
      { path: "community/story", Component: CommunityStory },
      { path: "community/concert", Component: CommunityConcert },
      { path: "community/*", Component: Placeholder },
      { path: "*", Component: Placeholder },
    ],
  },
]);