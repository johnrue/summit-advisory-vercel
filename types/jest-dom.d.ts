/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className?: string): R
      toHaveTextContent(text?: string | RegExp): R
      toHaveValue(value?: string | number | string[]): R
      toBeChecked(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeVisible(): R
      toHaveFocus(): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveStyle(css: string | Record<string, any>): R
      toContainHTML(htmlText: string): R
      toContainElement(element: HTMLElement | null): R
      toBeEmptyDOMElement(): R
      toBeInvalid(): R
      toBeValid(): R
      toHaveAccessibleDescription(text?: string | RegExp): R
      toHaveAccessibleName(text?: string | RegExp): R
      toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R
      toBePartiallyChecked(): R
      toHaveErrorMessage(text?: string | RegExp): R
    }
  }
}