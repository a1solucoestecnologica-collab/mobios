export function createPlatformContext(deps) {
  const authorize = deps.authorize || (() => {});
  return {
    db: deps.db,
    authorize,
    readJson: deps.readJson,
    sendJson: deps.sendJson,
    HttpError: deps.HttpError,
  };
}
