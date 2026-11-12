import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return <main id="main" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-24 sm:px-6">
    <h1 className="display text-5xl">Page not found</h1>
    <p className="text-dim">There’s nothing at this address.</p>
    <ButtonLink href="/" variant="primary" className="self-start">Home</ButtonLink>
  </main>;
}
