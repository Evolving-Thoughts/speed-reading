import { createContext, useContext, useState } from "react";
import type { ArticleImage as ImageData } from "./article";

/**
 * Imported articles never tell the image host where they are read. The browser
 * extension shows the page’s own images and keeps the page’s policy instead.
 */
export const ImageReferrerPolicy = createContext<"no-referrer" | undefined>(
  "no-referrer",
);
export function ArticleImage({
  image,
  reading = false,
  inline = false,
  complete = false,
}: {
  image: ImageData;
  reading?: boolean;
  inline?: boolean;
  complete?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const referrerPolicy = useContext(ImageReferrerPolicy);
  const Wrapper = inline ? "span" : "figure";
  const Caption = inline ? "span" : "figcaption";
  return (
    <Wrapper
      className={reading ? "article-image reading-image" : "article-image"}
    >
      {failed ? (
        <span className="image-error" role="status">
          Bild konnte nicht geladen werden. Du kannst trotzdem weiterlesen.
        </span>
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          referrerPolicy={referrerPolicy}
          loading={reading ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      )}
      {image.caption && (
        <Caption className="image-caption">{image.caption}</Caption>
      )}
      {reading && !complete && (
        <p className="hint">
          Bildpause · Mit „Weiterlesen“ setzt du den Text fort.
        </p>
      )}
    </Wrapper>
  );
}
