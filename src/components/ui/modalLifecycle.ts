interface BodyScrollTarget {
  style: { overflow: string }
}

let activeLocks = 0
let initialOverflow = ''
let lockedTarget: BodyScrollTarget | null = null

export function acquireBodyScrollLock(target: BodyScrollTarget): () => void {
  if (activeLocks === 0) {
    initialOverflow = target.style.overflow
    lockedTarget = target
    target.style.overflow = 'hidden'
  }
  activeLocks += 1

  let released = false
  return () => {
    if (released) return
    released = true
    activeLocks -= 1
    if (activeLocks === 0 && lockedTarget) {
      lockedTarget.style.overflow = initialOverflow
      lockedTarget = null
    }
  }
}
