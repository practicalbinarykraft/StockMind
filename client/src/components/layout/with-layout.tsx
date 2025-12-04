import { ComponentType } from "react"
import { AppLayout } from "./app-layout"

/**
 * HOC to wrap a component with AppLayout
 */
export function withLayout<P extends object>(
  Component: ComponentType<P>
) {
  return function LayoutWrapper(props: P) {
    return (
      <AppLayout>
        <Component {...props} />
      </AppLayout>
    )
  }
}

