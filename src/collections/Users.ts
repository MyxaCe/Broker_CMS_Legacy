import type { Access, CollectionConfig, FieldAccess } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
const isAdminField: FieldAccess = ({ req }) => req.user?.role === 'admin'

const adminOrSelf: Access = ({ req }) =>
  req.user?.role === 'admin' ? true : { id: { equals: req.user?.id ?? '' } }

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: adminOrSelf,
    update: adminOrSelf,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Редактор', value: 'editor' },
      ],
      saveToJWT: true,
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      label: 'Роль',
    },
  ],
  versions: false,
}
