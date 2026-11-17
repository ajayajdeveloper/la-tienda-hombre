import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { errorMessage, useAddReviewMutation, useGetReviewsQuery } from '../../store/apiSlice.js'
import { showToast } from '../../store/uiSlice.js'
import { formatLongDate, pluralize } from '../../lib/format.js'
import { Stars } from '../product/Rating.jsx'
import Modal from '../ui/Modal.jsx'
import { Skeleton } from '../ui/Feedback.jsx'
import styles from './Reviews.module.css'

export default function Reviews({ slug }) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const [writing, setWriting] = useState(false)
  const { data, isLoading, isFetching } = useGetReviewsQuery({ slug, page, sort })

  if (isLoading) return <Skeleton height="12rem" />
  const { summary, items, totalPages } = data

  return (
    <section className={styles.section} id="reviews" aria-labelledby="reviews-title">
      <div className={styles.summary}>
        <h2 id="reviews-title" className={styles.title}>Customer reviews</h2>
        {summary.count > 0 ? (
          <>
            <p className={styles.average}>
              <span>{Number(summary.average).toFixed(1)}</span>
              <Stars value={summary.average} size={18} />
            </p>
            <p className={styles.based}>Based on {pluralize(summary.count, 'review')}</p>
            {/* Rating histogram: % of reviews per star level. */}
            <ul className={styles.histogram}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n = summary.distribution[star]
                const pct = summary.count ? Math.round((n / summary.count) * 100) : 0
                return (
                  <li key={star}>
                    <span>{star} ★</span>
                    <span className={styles.bar}>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span className={styles.pct}>{n}</span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className={styles.based}>No reviews yet. Be the first.</p>
        )}
        <button className="btn btn-outline btn-block" onClick={() => setWriting(true)}>
          Write a review
        </button>
      </div>

      <div className={styles.list} data-stale={isFetching}>
        {items.length > 0 && (
          <label className={styles.sort}>
            Sort by
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
            >
              <option value="newest">Newest</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </label>
        )}
        {items.map((review) => (
          <article key={review.id} className={styles.review}>
            <Stars value={review.rating} size={14} />
            {review.title && <h3 className={styles.reviewTitle}>{review.title}</h3>}
            {review.body && <p className={styles.body}>{review.body}</p>}
            <p className={styles.meta}>
              {review.author_name} · {formatLongDate(review.created_at)}
            </p>
          </article>
        ))}
        {totalPages > 1 && (
          <div className={styles.pager}>
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      <WriteReview slug={slug} open={writing} onClose={() => setWriting(false)} />
    </section>
  )
}

function WriteReview({ slug, open, onClose }) {
  const [rating, setRating] = useState(0)
  const [form, setForm] = useState({ title: '', body: '', authorName: '' })
  const [addReview, { isLoading, error }] = useAddReviewMutation()
  const dispatch = useDispatch()

  async function submit(event) {
    event.preventDefault()
    try {
      // .unwrap() turns the mutation result into a normal promise that throws on error.
      await addReview({ slug, rating, ...form }).unwrap()
      dispatch(showToast('Thanks! Your review is live.'))
      setRating(0)
      setForm({ title: '', body: '', authorName: '' })
      onClose()
    } catch {
      // `error` from the hook is rendered below
    }
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title="Write a review">
      <form className={styles.form} onSubmit={submit}>
        <fieldset className={styles.starPicker}>
          <legend>Your rating</legend>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} data-on={n <= rating}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
              <span aria-hidden="true">★</span>
              <span className="visually-hidden">{pluralize(n, 'star')}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span>Your name</span>
          <input className="input" value={form.authorName} onChange={update('authorName')} required maxLength={40} />
        </label>
        <label className="field">
          <span>Headline</span>
          <input className="input" value={form.title} onChange={update('title')} maxLength={80} />
        </label>
        <label className="field">
          <span>Review</span>
          <textarea className="input" rows={4} value={form.body} onChange={update('body')} maxLength={1000} />
        </label>
        {error && <p className="field-error">{errorMessage(error)}</p>}
        <button className="btn btn-primary btn-block" disabled={!rating || !form.authorName || isLoading}>
          {isLoading ? 'Posting…' : 'Post review'}
        </button>
      </form>
    </Modal>
  )
}
