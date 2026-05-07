import { useAssetStore } from "../store/useAssetStore";
import type { ImageElement, ImageSrc, Template } from "../types/template";

// Resolve a bindable value against a data row
export function resolve<T>(
    bindable: { type: 'static'; value: T } | { type: 'binding'; column: string },
    row?: Record<string, string>
): T | string {
    if (bindable.type === 'static') return bindable.value
    return row?.[bindable.column] ?? `{{${bindable.column}}}`
}

// helper — resolves assetIds by name in the loaded template
export function resolveAssetIds(template: Template): Template {

    // Just reads the state of the store and does not subscribe to changes.
    const { getAssetByName } = useAssetStore.getState()

    const resolveImageSrc = (src: ImageSrc): ImageSrc => {
        if (src.type === 'asset') {
        const local = getAssetByName(src.assetName)
        if (local) {
            // Found locally by name — update ID to local ID
            return { ...src, assetId: local.id }
        }
        // Not found — keep reference as-is, will show missing state
        return src
        }

        if (src.type === 'binding' && src.placeholder) {
        const local = getAssetByName(src.placeholder.assetName)
        if (local) {
            return {
            ...src,
            placeholder: { ...src.placeholder, assetId: local.id }
            }
        }
        return src
    }

    return src
  }

  return {
    ...template,
    elements: template.elements.map((el) => {
        if (el.type !== 'image') return el
        const imgEl = el as ImageElement
        return {
            ...imgEl,
            props: {
            ...imgEl.props,
            src: resolveImageSrc(imgEl.props.src)
            }
        }
    })
  }
}