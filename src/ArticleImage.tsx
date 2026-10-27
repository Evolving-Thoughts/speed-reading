import { useState } from "react";
import type { ArticleImage as ImageData } from "./article";
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
          referrerPolicy="no-referrer"
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
