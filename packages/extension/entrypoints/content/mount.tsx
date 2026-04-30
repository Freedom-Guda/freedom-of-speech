import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createRoot, type Root } from 'react-dom/client';
import { CommentOverlay } from '@/components/CommentOverlay/CommentOverlay';
import { canonicalizeURL, urlToHash } from '@/lib/url';
import '@/styles/global.css';

export async function mountOverlay(ctx: ContentScriptContext) {
  const ui = await createShadowRootUi(ctx, {
    name: 'fos-comment-overlay',
    position: 'inline',
    anchor: 'body',
    append: 'last',
    onMount(container) {
      const wrapper = document.createElement('div');
      wrapper.id = 'fos-root';
      container.append(wrapper);

      const canonical = canonicalizeURL(window.location.href);
      const urlHash = urlToHash(canonical);

      const root: Root = createRoot(wrapper);
      root.render(<CommentOverlay url={canonical} urlHash={urlHash} />);
      return { root, wrapper };
    },
    onRemove(state) {
      state?.root.unmount();
      state?.wrapper.remove();
    },
  });

  ui.mount();
  return ui;
}
