import { TextLink } from '@/components/molecules';
import { PageMessage } from '@/components/molecules/PageMessage';

export default function NotFound() {
  return (
    <PageMessage title="Page not found" actions={<TextLink href="/">Back to play</TextLink>}>
        <p>
          This page doesn&apos;t exist, or the link is out of date. Check the address, or head back to Play.
        </p>
    </PageMessage>
  );
}
