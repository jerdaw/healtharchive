import { axe } from "vitest-axe";
import type { RenderResult } from "@testing-library/react";

/**
 * Run axe accessibility tests on a rendered component.
 *
 * @param container - The container element from @testing-library/react render
 * @param options - Optional axe configuration
 * @returns Promise that resolves with axe results
 *
 * @example
 * const { container } = render(<MyComponent />);
 * await expectNoA11yViolations(container);
 */
export async function expectNoA11yViolations(
  container: Element,
  options?: {
    /**
     * Axe rules to run. If not specified, all rules run.
     * See https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
     */
    rules?: Record<string, { enabled: boolean }>;
  },
) {
  const results = await axe(container, options);
  expect(results).toHaveNoViolations();
  return results;
}

/**
 * Helper to get the container from a RenderResult
 */
export function getA11yContainer(renderResult: RenderResult): Element {
  return renderResult.container;
}
