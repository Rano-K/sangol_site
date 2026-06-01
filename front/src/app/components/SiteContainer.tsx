import type { ElementType, ReactNode } from "react";
import { cn } from "./ui/utils";
import { siteContainerClass, siteContainerNarrowClass } from "../lib/siteLayout";

type SiteContainerProps = {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  as?: ElementType;
};

export function SiteContainer({ children, className, narrow, as: Tag = "div" }: SiteContainerProps) {
  return <Tag className={cn(narrow ? siteContainerNarrowClass : siteContainerClass, className)}>{children}</Tag>;
}
