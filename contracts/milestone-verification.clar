;; Milestone Verification Contract
;; Tracks completion of project phases

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map projects
  { project-id: (string-ascii 36) }
  {
    name: (string-ascii 100),
    owner: principal,
    contractor: principal,
    start-date: uint,
    end-date: uint,
    status: (string-ascii 20)
  }
)

(define-map milestones
  {
    project-id: (string-ascii 36),
    milestone-id: (string-ascii 36)
  }
  {
    name: (string-ascii 100),
    description: (string-ascii 500),
    deadline: uint,
    completed: bool,
    verified: bool,
    payment-percentage: uint
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_ALREADY_EXISTS u101)
(define-constant ERR_NOT_FOUND u102)
(define-constant ERR_INVALID_PROJECT u103)

;; Read-only functions
(define-read-only (get-project (project-id (string-ascii 36)))
  (map-get? projects { project-id: project-id })
)

(define-read-only (get-milestone (project-id (string-ascii 36)) (milestone-id (string-ascii 36)))
  (map-get? milestones { project-id: project-id, milestone-id: milestone-id })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

(define-read-only (is-project-owner (project-id (string-ascii 36)))
  (match (get-project project-id)
    project (is-eq tx-sender (get owner project))
    false
  )
)

(define-read-only (is-project-contractor (project-id (string-ascii 36)))
  (match (get-project project-id)
    project (is-eq tx-sender (get contractor project))
    false
  )
)

;; Public functions
(define-public (create-project
    (project-id (string-ascii 36))
    (name (string-ascii 100))
    (contractor principal)
    (start-date uint)
    (end-date uint)
  )
  (let ((existing-project (get-project project-id)))
    (asserts! (is-none existing-project) (err ERR_ALREADY_EXISTS))

    (ok (map-set projects
      { project-id: project-id }
      {
        name: name,
        owner: tx-sender,
        contractor: contractor,
        start-date: start-date,
        end-date: end-date,
        status: "active"
      }
    ))
  )
)

(define-public (add-milestone
    (project-id (string-ascii 36))
    (milestone-id (string-ascii 36))
    (name (string-ascii 100))
    (description (string-ascii 500))
    (deadline uint)
    (payment-percentage uint)
  )
  (begin
    (asserts! (or (is-project-owner project-id) (is-admin)) (err ERR_UNAUTHORIZED))
    (asserts! (is-some (get-project project-id)) (err ERR_INVALID_PROJECT))
    (asserts! (<= payment-percentage u100) (err u104)) ;; Payment percentage must be between 0-100

    (ok (map-set milestones
      { project-id: project-id, milestone-id: milestone-id }
      {
        name: name,
        description: description,
        deadline: deadline,
        completed: false,
        verified: false,
        payment-percentage: payment-percentage
      }
    ))
  )
)

(define-public (mark-milestone-completed
    (project-id (string-ascii 36))
    (milestone-id (string-ascii 36))
  )
  (begin
    (asserts! (is-project-contractor project-id) (err ERR_UNAUTHORIZED))

    (match (get-milestone project-id milestone-id)
      milestone (ok (map-set milestones
                    { project-id: project-id, milestone-id: milestone-id }
                    (merge milestone { completed: true })
                  ))
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (verify-milestone
    (project-id (string-ascii 36))
    (milestone-id (string-ascii 36))
  )
  (begin
    (asserts! (or (is-project-owner project-id) (is-admin)) (err ERR_UNAUTHORIZED))

    (match (get-milestone project-id milestone-id)
      milestone (ok (map-set milestones
                    { project-id: project-id, milestone-id: milestone-id }
                    (merge milestone { verified: true })
                  ))
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (update-project-status
    (project-id (string-ascii 36))
    (new-status (string-ascii 20))
  )
  (begin
    (asserts! (or (is-project-owner project-id) (is-admin)) (err ERR_UNAUTHORIZED))

    (match (get-project project-id)
      project (ok (map-set projects
                  { project-id: project-id }
                  (merge project { status: new-status })
                ))
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)
