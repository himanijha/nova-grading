/** The mark next to anyone who came to an info session: a star with an I. */
export default function InfoStar({ size = 18 }) {
  return (
    <svg
      className="info-star"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Came to an info session"
    >
      <title>Came to an info session</title>
      <path d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z" />
      <text x="12" y="15.2" textAnchor="middle">
        I
      </text>
    </svg>
  );
}
