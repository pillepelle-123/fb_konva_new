interface BookTitleProps {
  title: string;
}

export default function BookTitle({ title }: BookTitleProps) {
  return (
    <div className="text-center md:text-right">
      <h1 className="text-sm md:text-lg font-semibold text-foreground whitespace-nowrap">
        {title}
      </h1>
    </div>
  );
}