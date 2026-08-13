/**
 * FraseDestaque — citação central isolada na home.
 */
import './FraseDestaque.css';

export function FraseDestaque() {
  return (
    <section className="mv-frase">
      <div className="mv-frase__inner">
        <blockquote className="mv-frase__quote">
          <p className="mv-frase__text">
            &ldquo;Lutamos diariamente pela preservação ambiental com
            transparência e participação comunitária.&rdquo;
          </p>
        </blockquote>
        <p className="mv-frase__by">Mata Viva</p>
      </div>
    </section>
  );
}

export default FraseDestaque;