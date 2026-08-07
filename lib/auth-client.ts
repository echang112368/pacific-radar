"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        termsAccepted: {
          type: "boolean",
          required: true,
          returned: false,
        },
        termsAcceptedAt: {
          type: "date",
          input: false,
          returned: false,
        },
        termsVersion: {
          type: "string",
          input: false,
          returned: false,
        },
      },
    }),
  ],
});
