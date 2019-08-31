import { registerComponent } from '../components'

export function registerCustomComponent(
  comp,
  registerCompFn = registerComponent,
) {
  if (comp instanceof Function) {
    registerCompFn(comp)
  } else {
    const compNames = Object.keys(comp) // this approach handles both an array and an object (like the mjml-accordion default export)
    compNames.forEach(compName => {
      registerCustomComponent(comp[compName], registerCompFn)
    })
  }
}

export default function handleMjmlConfig() {
  const result = {
    success: [],
    failures: [],
  }

  return result
}
