import { getUser } from "../database/db.js";

export const verifyUser = (req, res, next) => {
    const { session } = req.cookies;
    if (typeof session !== 'string') {
        req.user = null;
        next();
    } else {
        getUser(session).then(user => {
            if (user !== null) {
                req.user = {
                    ...user,
                    session: session,
                };
            } else {
                req.user = null;
            }
            next();
        })
    }
}