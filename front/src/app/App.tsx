import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ShoppingProvider } from "./hooks/useShopping";
import { AuthProvider } from "./hooks/useAuth";

export default function App() {
  return (
    <AuthProvider>
      <ShoppingProvider>
        <RouterProvider router={router} />
      </ShoppingProvider>
    </AuthProvider>
  );
}