import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type NavItem = { id: string; label: string; icon?: React.ReactNode; to: string };

export default function ResponsiveTopNav({ items }: { items: NavItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const [visibleCount, setVisibleCount] = useState(items.length);
  const [compact, setCompact] = useState(false); // false = label+ícone; true = ícone-apenas
  const [menuOpen, setMenuOpen] = useState(false);

  function fitCount(available: number, mode: "labels" | "icons") {
    const list = listRef.current!;
    const children = Array.from(list.children) as HTMLLIElement[];
    let acc = 0;
    let vis = 0;

    for (const li of children) {
      const liW = li.getBoundingClientRect().width;
      const label = li.querySelector<HTMLElement>(".label");
      const labelW = label ? label.getBoundingClientRect().width : 0;

      // largura estimada do item no modo pedido
      const w =
        mode === "labels"
          ? liW
          : Math.max( // mantém padding/ícone e remove a parte do label
              0,
              liW - labelW
            );

      if (acc + w <= available) {
        acc += w;
        vis++;
      } else break;
    }
    return vis;
  }

  const measure = () => {
    const cont = containerRef.current;
    const list = listRef.current;
    const moreBtn = moreBtnRef.current;
    if (!cont || !list || !moreBtn) return;

    // Passo 1: assume que NÃO precisa de botão "Mais"
    const totalW = cont.clientWidth;

    let visLabels = fitCount(totalW, "labels");

    // Se tudo coube com labels, encerra
    if (visLabels === items.length) {
      setCompact(false);
      setVisibleCount(items.length);
      return;
    }

    // Passo 2: vai precisar de "Mais"; subtrai a largura do botão "Mais" e reavalia
    const available = totalW - moreBtn.offsetWidth - 8; // 8 = gap mínimo
    visLabels = fitCount(available, "labels");

    // Tenta modo compacto (ícone-apenas) ANTES de empurrar mais itens para o "Mais"
    const visIcons = fitCount(available, "icons");

    // Estratégia:
    // - Preferir labels; se não couber tudo, escolher o modo que exiba MAIS itens visíveis.
    const chooseCompact = visIcons > visLabels;
    setCompact(chooseCompact);
    setVisibleCount(chooseCompact ? visIcons : visLabels);
  };

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { measure(); }, []); // 1ª medição

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);

  return (
    <nav className="priority-nav" data-compact={compact ? "true" : "false"}>
      <div className="priority-nav__container" ref={containerRef}>
        <ul className="priority-nav__list" ref={listRef}>
          {visible.map(it => (
            <li key={it.id} className="priority-nav__item">
              <Link to={it.to} className="priority-nav__link">
                {it.icon && <span className="icon">{it.icon}</span>}
                <span className="label">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="priority-nav__more">
          <button
            ref={moreBtnRef}
            className="priority-nav__moreBtn"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            …
          </button>
          {overflow.length > 0 && menuOpen && (
            <div className="priority-nav__menu" role="menu">
              {overflow.map(it => (
                <Link key={it.id} to={it.to} className="priority-nav__menuItem" role="menuitem">
                  {it.icon && <span className="icon">{it.icon}</span>}
                  <span className="label">{it.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
