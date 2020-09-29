/* eslint-disable node/no-process-env */
import { config } from 'dotenv';

config();

export default {
  discord: {
    token: <string>process.env.DISCORD_TOKEN,
  },
};
