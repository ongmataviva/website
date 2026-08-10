// Pinned ("cativo") category filter for the "noticia" collection.
//
// Rendered through the `renderCollectionControls` slot (see index.jsx) on top
// of the default LaikaCollectionControls. It renders a sticky chip bar with
// one chip per category actually present in the collection entries, plus a
// "Todas" chip that clears the filter. Filtering reuses the core's own
// view-filter machinery: `onFilterClick` dispatches `filterByField`, and the
// entries reducer applies the regex pattern against the `categoria` field.
import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@laikacms/decap-cms/core";
import { LaikaCollectionControls } from "@laikacms/decap-cms/laika-app/bare";

const NEWS_COLLECTION = "noticia";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function prettifySlug(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function collectionNameFromHash() {
  const m = window.location.hash.match(/\/collections\/([^/]+)(?:\/|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function CategoryFilterBar(props) {
  const { filter, onFilterClick } = props;
  const [collectionName, setCollectionName] = useState(collectionNameFromHash);

  useEffect(() => {
    const onChange = () => setCollectionName(collectionNameFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const entities = useAppSelector((state) => state.entries?.entities);

  const categories = useMemo(() => {
    if (collectionName !== NEWS_COLLECTION) return [];
    const seen = new Set();
    for (const entry of Object.values(entities || {})) {
      if (entry?.collection !== NEWS_COLLECTION) continue;
      const value = entry?.data?.categoria;
      if (value) seen.add(String(value));
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [collectionName, entities]);

  const activeCategoryId = useMemo(() => {
    for (const f of Object.values(filter || {})) {
      if (f?.active && f?.field === "categoria") return f.id;
    }
    return undefined;
  }, [filter]);

  const handleCategory = (value) => {
    onFilterClick({
      id: `categoria-${value}`,
      label: prettifySlug(value),
      field: "categoria",
      pattern: `^${escapeRegExp(value)}$`,
    });
  };

  const handleClear = () => {
    for (const f of Object.values(filter || {})) {
      if (f?.active) onFilterClick(f);
    }
  };

  const showBar = collectionName === NEWS_COLLECTION && categories.length > 0;

  return (
    <>
      {showBar && (
        <div className="cmv-filter-bar">
          <button
            type="button"
            className={`cmv-chip ${activeCategoryId ? "" : "cmv-chip-active"}`}
            onClick={handleClear}
          >
            Todas
          </button>
          {categories.map((value) => {
            const id = `categoria-${value}`;
            return (
              <button
                key={value}
                type="button"
                className={`cmv-chip ${activeCategoryId === id ? "cmv-chip-active" : ""}`}
                onClick={() => handleCategory(value)}
              >
                {prettifySlug(value)}
              </button>
            );
          })}
        </div>
      )}
      <LaikaCollectionControls {...props} />
    </>
  );
}
