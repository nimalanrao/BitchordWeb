import { PrefetchLink } from '@/components/PrefetchLink';
import type { CategoryGroup } from '@/data/music/types';
import { getCategoryCover } from '@/lib/categoryCovers';
import { browseHref } from './links';

/**
 * Browse Categories bricks: 16:9 tiles with high-resolution, optimized
 * album covers as the background, blended seamlessly with the category theme colour.
 */
export function CategoryTiles({ groups }: { groups: CategoryGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.title} className="pt-3" aria-label={group.title}>
          <h2 className="mx-(--body-gutter) type-title-2-emphasized">{group.title}</h2>
          {/* 4 columns at ≥1000px, gap 20px (report §6); 3, then 2, below. */}
          <ul className="mx-(--body-gutter) mt-3 mb-8 grid grid-cols-4 gap-5 max-lg:grid-cols-3 max-[607px]:grid-cols-2 max-[607px]:gap-2.5">
            {group.categories.map((category) => {
              const coverUrl = getCategoryCover(category.title);
              return (
                <li key={`${category.title}-${category.link.params}`}>
                  <PrefetchLink
                    to={browseHref(category.link)}
                    className="group relative flex aspect-video items-end overflow-hidden rounded-artwork-lg bg-neutral-900 px-3.5 py-3 text-white transition-all duration-300 ease-panel hover:scale-[1.02] shadow-[0_4px_16px_rgba(0,0,0,0.3)] ring-1 ring-white/10"
                    style={{ '--tile-color': category.color } as React.CSSProperties}
                  >
                    {/* Optimized album cover background image */}
                    <img
                      src={coverUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 size-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                      onError={(e) => {
                        // If image fails, hide it gracefully so gradient stands clean
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Category theme color overlay blending smoothly into the album artwork */}
                    <div
                      className="absolute inset-0 size-full transition-opacity duration-300"
                      style={{
                        background:
                          'linear-gradient(135deg, color-mix(in srgb, var(--tile-color) 70%, transparent) 0%, color-mix(in srgb, var(--tile-color) 45%, #000) 100%)',
                        mixBlendMode: 'multiply',
                      }}
                    />

                    {/* Dark gradient vignette at the bottom ensuring title text readability */}
                    <div className="absolute inset-0 size-full bg-gradient-to-t from-black/85 via-black/35 50% to-transparent pointer-events-none" />

                    {/* Subtle specular rim lighting */}
                    <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15 pointer-events-none" />

                    {/* Category Title */}
                    <span className="relative z-10 type-title-2-emphasized drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {category.title}
                    </span>
                  </PrefetchLink>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
