export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  account_type: 'personal' | 'business' | 'creator'
  is_private: boolean
  role: 'user' | 'admin'
  note: string | null
  note_at: string | null
  interests: string[]
  onboarded: boolean
  created_at: string
}
export type Author = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
export type Post = {
  id: string
  user_id: string
  type: 'pin' | 'reel' | 'story'
  title: string | null
  description: string | null
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url: string | null
  aspect_ratio: number
  source_url: string | null
  tags: string[] | null
  alt_text: string | null
  location: string | null
  category: string | null
  dominant_color: string | null
  likes_count: number
  comments_count: number
  saves_count: number
  views_count: number
  shares_count: number
  allow_comments: boolean
  is_paid_partnership: boolean
  partner_brand: string | null
  status: string
  audience: string
  publish_at: string
  expires_at: string | null
  created_at: string
  author?: Author
}
export type Board = {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_url: string | null
  is_private: boolean
  created_at: string
}
export const POST_SELECT = '*, author:profiles!posts_user_id_fkey(id,username,full_name,avatar_url)'

export const CATEGORIES = [
  'Home decor', 'Fashion', 'Food & drink', 'Travel', 'Art', 'Photography', 'Beauty', 'DIY & crafts',
  'Design', 'Architecture', 'Fitness', 'Tech', 'Cars', 'Wedding', 'Quotes', 'Business', 'Animals', 'Gardening',
  'Film', 'Music', 'Illustration', 'Kids', 'Education', 'Outdoors',
]
export const slug = (s: string) => s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
