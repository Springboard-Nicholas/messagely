/** User class for message.ly */

const db = require("../db");
const expressError = require("../expressError");
const bcrypt = require('bcrypt');
const {SECRET_KEY, BCRYPT_WORK_FACTOR} = require("../config");
const ExpressError = require("../expressError");
const res = require("express/lib/response");

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
      const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

      const joinDate = new Date().toUTCString();
      const joinDateNoTimeZone = joinDate.slice(0, 21);

      const result = await db.query(
        `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING username, password, first_name, last_name, phone`,
        [username, hashedPassword, first_name, last_name, phone, joinDateNoTimeZone, joinDate]
      );
      return result.rows[0];
    
   }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    const results = await db.query(`SELECT password FROM users WHERE username=$1`, [username]);

    const user = results.rows[0];

    if( await bcrypt.compare(password, user.password)) {
      return true;
    }
    else {
      return false;
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {

    const lastLoginDate = new Date().toUTCString();

    const result = await db.query(
      `UPDATE users SET last_login_at=$1
      WHERE username=$2`,
      [lastLoginDate, username]
    );
   }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() { 
    const users = await db.query(
      `SELECT username, first_name, last_name, phone
      FROM users`
    );

    return users.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) { 
    const users = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username=$1`,
      [username]
    );

    if(users.rows.length === 0) {
      throw new ExpressError('Invaild Username', 404);
    }

    return users.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    const results = await db.query(
      `SELECT m.id,
      m.to_username,
      t.first_name,
      t.last_name,
      t.phone,
      m.body,
      m.sent_at,
      m.read_at
      FROM messages AS m
      JOIN users AS f ON m.from_username = f.username
      JOIN users AS t ON m.to_username = t.username
      WHERE f.username = $1`,
      [username]
    );

    if(results.rows.length === 0) {
      throw new ExpressError('Invaild Username', 404);
    }

    const resultsArr = [];

    for(let r of results.rows) {
      resultsArr.push({
        id: r.id,
        to_user: {
          username: r.to_username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at
      })
    }
    

    return resultsArr;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `SELECT m.id,
      m.from_username,
      f.first_name,
      f.last_name,
      f.phone,
      m.body,
      m.sent_at,
      m.read_at
      FROM messages AS m
      JOIN users AS f ON m.from_username = f.username
      JOIN users AS t ON m.to_username = t.username
      WHERE t.username = $1`,
      [username]
    );

    if(results.rows.length === 0) {
      throw new ExpressError('Invaild Username', 404);
    }

    const resultsArr = [];

    for(let r of results.rows) {
      resultsArr.push({
        id: r.id,
        from_user: {
          username: r.from_username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at
      })
    }
    

    return resultsArr;

   }
}


module.exports = User;