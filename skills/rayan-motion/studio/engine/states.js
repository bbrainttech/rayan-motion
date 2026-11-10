{
  const STATE = /:(?:hover|focus-visible|focus-within|focus|active)(?![-\w])/
  const swap = (css) => css
    .replace(/:has\(\s*:focus-within\s*\)/g, ':has([data-x-focus])')
    .replace(/:focus-within(?![-\w])/g, ':is([data-x-focus], :has([data-x-focus]))')
    .replace(/:focus-visible(?![-\w])/g, '[data-x-focus-visible]')
    .replace(/:focus(?![-\w])/g, '[data-x-focus]')
    .replace(/:hover(?![-\w])/g, '[data-x-hover]')
    .replace(/:active(?![-\w])/g, '[data-x-active]')
  let added = 0
  let skipped = 0
  const walk = (parent) => {
    const rules = parent.cssRules
    for (let i = rules.length - 1; i >= 0; i--) {
      const r = rules[i]
      if (r instanceof CSSStyleRule) {
        if (STATE.test(r.selectorText)) {
          try {
            parent.insertRule(swap(r.cssText), i + 1)
            added++
          } catch {
            skipped++
          }
        } else if (r.cssRules.length) walk(r)
      } else if (r.cssRules) walk(r)
    }
  }
  for (const sheet of document.styleSheets) walk(sheet)
  document.documentElement.dataset.xStates = `${added}/${skipped}`
  document.addEventListener('DOMContentLoaded', () => {
    for (const el of document.querySelectorAll('[data-x-popover-open]')) el.showPopover()
    for (const el of document.querySelectorAll('[data-x-modal]')) el.showModal()
  })
}
