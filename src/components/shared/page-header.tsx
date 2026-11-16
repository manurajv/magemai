type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
      ) : null}
    </header>
  );
}
