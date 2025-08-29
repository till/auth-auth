const config = {
  port: process.env.PORT || 3000,
  host: "localhost",
  // TODO(till): a wildcard pattern would be nice here
  allowed_redirects: ["http://localhost:3000/demo"],
};

export default config;
