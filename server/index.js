import cookie from "cookie"
import formidable from "formidable"

import Database from "@/server/database"

class Backend {
  getIpAddress(context) {
    return context.req.socket.remoteAddress
  }

  async parseMultipart(context) {
    return await new Promise((resolve, reject) => {
      formidable().parse(context.req, (error, body, files) => {
        if (error) return reject(error)

        context.req.body = body
        context.req.files = files
        return resolve({ body, files })
      })
    })
  }

  async login(context, token) {
    context.res.setHeader(
      "Set-Cookie",
      cookie.serialize("authToken", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 60 * 60,
        path: "/",
      })
    )
  }

  async logout(context) {
    const token =
      context.req.cookies.authToken &&
      (await Database.AuthToken.findByPk(context.req.cookies.authToken))
    token && (await token.destroy())

    context.res.setHeader(
      "Set-Cookie",
      cookie.serialize("authToken", null, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      })
    )
  }

  async getAuthenticatedUser(context) {
    if (!context.req.cookies.authToken) return null
    const token = await Database.AuthToken.findByPk(
      context.req.cookies.authToken
    )

    if (!token) return null
    else if (this.hasAuthTokenExpired(token)) {
      context.res.setHeader(
        "Set-Cookie",
        cookie.serialize("authToken", null, {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          maxAge: 0,
          path: "/",
        })
      )
      await token.destroy()
      return null
    }
    return (await Database.User.findByPk(token.user_id)) || null
  }

  hasAuthTokenExpired(token) {
    return Date.now() - new Date(token.createdAt).getTime() + 60 * 60 <= 0
  }
}

export default new Backend()