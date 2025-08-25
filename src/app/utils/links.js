export const getLink = (url, redirectUrl) => {
  if (redirectUrl) {
    url += `?redirect_url=${encodeURIComponent(redirectUrl)}`;
  }
  return url;
};
