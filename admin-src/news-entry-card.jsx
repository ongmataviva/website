// Custom entry card for the "noticia" collection. Shows the news date
// (frontmatter `data`) and the category next to the title so editors can
// manage the list at a glance. Rendered through the `renderEntryCard` slot
// (see index.jsx) only for the noticia collection — every other collection
// keeps the default LaikaEntryCard.
//
// Layout contracts are copied from the fork's LaikaEntryCard / EntryListing:
// - list view: the <li> itself is the flex item (100% - 12px)
// - grid view: a wrapper <div> is the flex item (33.333% - 12px)
const VIEW_STYLE_LIST = "VIEW_STYLE_LIST";
const VIEW_STYLE_GRID = "VIEW_STYLE_GRID";

function formatDate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
}

function prettifySlug(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Local/proxy backend serves media from `public/`, so `images/foo.png` is
// reachable at `/images/foo.png`; absolute URLs pass through untouched.
function toMediaUrl(value) {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

const workflowLabels = {
  draft: "Draft",
  review: "Em revisão",
  ready: "Pronto",
};

export function NewsEntryCard({
  collection,
  entry,
  viewStyle = VIEW_STYLE_LIST,
  workflowStatus,
}) {
  const data = entry?.data ?? {};
  const summary = data.titulo || data.title || entry?.slug || "Sem título";
  const dateText = formatDate(data.data);
  const category = data.categoria ? String(data.categoria) : null;
  const image = toMediaUrl(data.imagem);
  const path = `#/collections/${collection.name}/entries/${entry.slug}`;
  const workflow = workflowStatus ?? entry?.workflowStatus;

  const meta = (
    <span className="cmv-meta">
      {category && <span className="cmv-meta-cat">{prettifySlug(category)}</span>}
      <span className="cmv-meta-date">{dateText}</span>
      {workflow && workflowLabels[workflow] && (
        <span className="cmv-meta-status">{workflowLabels[workflow]}</span>
      )}
    </span>
  );

  if (viewStyle === VIEW_STYLE_GRID) {
    return (
      <div
        style={{
          flex: "0 0 calc(33.333% - 12px)",
          maxWidth: "calc(33.333% - 12px)",
          margin: "0 12px 16px 0",
        }}
      >
        <li className="cmv-news-card cmv-news-card--grid" style={{ listStyle: "none", margin: 0 }}>
          <a href={path} data-laika-nav-item="true">
            {image ? (
              <div className="cmv-media" style={{ backgroundImage: `url("${image}")` }} />
            ) : (
              <div className="cmv-media cmv-media--placeholder" />
            )}
            <div className="cmv-body">
              <span className="cmv-title">{summary}</span>
              {meta}
            </div>
          </a>
        </li>
      </div>
    );
  }

  return (
    <li
      className="cmv-news-card cmv-news-card--list"
      style={{
        flex: "0 0 calc(100% - 12px)",
        maxWidth: "calc(100% - 12px)",
        listStyle: "none",
        margin: "0 0 8px 12px",
      }}
    >
      <a href={path} data-laika-nav-item="true">
        <span className="cmv-title">{summary}</span>
        {meta}
      </a>
    </li>
  );
}
