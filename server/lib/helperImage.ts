export const searchPexelsImages = async (
  query: string,
  count = 6
) => {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&per_page=${count}`,
    {
      headers: {
        Authorization: process.env.PIXELS_API_KEY!,
      },
    }
  );

  const data = await response.json();

  return (
    data.photos?.map(
      (photo: any) => photo.src.large2x || photo.src.large
    ) || []
  );
};