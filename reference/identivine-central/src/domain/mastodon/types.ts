import {
  type DBMastodonApp,
  type DBSiteMastodonIdentity,
} from "../../_db/models.js";

export type MastodonIdentityWithApp = {
  app: DBMastodonApp;
  identity: DBSiteMastodonIdentity;
};
