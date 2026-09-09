import { ProfileView } from '@/components/profile/ProfileView';
export default async function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfileView key={id} friendId={id} />;
}
