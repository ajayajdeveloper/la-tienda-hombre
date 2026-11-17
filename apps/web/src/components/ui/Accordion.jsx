import Icon from './Icon.jsx'
import styles from './Accordion.module.css'

// Native <details>/<summary>: keyboard support, screen-reader semantics and
// find-in-page all work without any JavaScript state.
export default function Accordion({ items, defaultOpen = 0 }) {
  return (
    <div className={styles.accordion}>
      {items.map((item, index) => (
        <details key={item.title} className={styles.item} open={index === defaultOpen}>
          <summary className={styles.summary}>
            <span>
              <span className={styles.title}>{item.title}</span>
              {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
            </span>
            <Icon name="chevronDown" size={18} className={styles.chevron} />
          </summary>
          <div className={styles.content}>{item.content}</div>
        </details>
      ))}
    </div>
  )
}
