export type ImagesIndex = {
  version: number;
  images: Record<
    string,
    {
      key: string;
      name?: string;
      size?: number;
    }
  >;
};

export const INDEX_KEY = "images-index.json";

export function emptyIndex(): ImagesIndex {
  return { version: 1, images: {} };
}
