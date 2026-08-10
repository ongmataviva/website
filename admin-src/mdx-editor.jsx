import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  ListsToggle,
  Separator,
} from '@mdxeditor/editor';
import editorCss from '@mdxeditor/editor/style.css';

/* ============================================================
   Editor Markdown (MDXEditor) para os campos body/pagina.

   O esbuild transforma o stylesheet em texto
   (--loader:.css=text); injetamos uma única vez no <head>.
   O valor do rascunho é um RichtextValue do motor — usamos
   String(value) para obter o markdown como texto puro.
   ============================================================ */

{
  const style = document.createElement('style');
  style.setAttribute('data-mdxeditor', '');
  style.textContent = editorCss;
  document.head.appendChild(style);
}

export default function MarkdownEditor({ value, onChange }) {
  const initial = typeof value === 'string' ? value : String(value ?? '');

  return (
    <div className="pnl-mdx">
      <MDXEditor
        markdown={initial}
        onChange={(md) => onChange(md)}
        contentEditableClassName="pnl-mdx-content"
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <ListsToggle />
                <CreateLink />
              </>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          markdownShortcutPlugin(),
        ]}
      />
    </div>
  );
}
