const port = process.env.PORT! ?? 4000;
const DATABASE_URL = process.env.DATABASE_URL!;
const SESSION_SECRET = process.env.SESSION_SECRET!;
const NODE_ENV = process.env.NODE_ENV!;
const configs = {
    port,
    DATABASE_URL,
    SESSION_SECRET,
    NODE_ENV

};

export default configs;