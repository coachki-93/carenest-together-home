export interface GuidebookBlock {
  heading?: string;
  body?: string[];
  steps?: string[];
}

/** Renders one guidebook section body: optional headings, short paragraphs
 *  and ordered step lists. Content comes from i18n (en/sv). */
export function GuidebookBlocks({ blocks }: { blocks: GuidebookBlock[] }) {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => (
        <div key={i} className="space-y-2">
          {block.heading && (
            <h3 className="text-sm font-bold text-foreground">{block.heading}</h3>
          )}
          {block.body?.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {block.steps && block.steps.length > 0 && (
            <ol className="list-decimal space-y-1.5 pl-5">
              {block.steps.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
