import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { users, type User } from '../../db/schema.js'
import { NotFoundError } from '../../lib/errors.js'

export async function getUserById(id: string): Promise<User> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  })
  if (!user) throw new NotFoundError('User not found')
  return user
}
