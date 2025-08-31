const config = {
  port: process.env.PORT || 3000,
  host: "localhost",
  // TODO(till): a wildcard pattern would be nice here
  allowed_redirects: ["http://localhost:3000/demo"],
  social: {
    github: {
      id: process.env.GITHUB_CLIENT_ID,
      secret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
};

export default config;
