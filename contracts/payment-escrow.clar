;; Payment Escrow Contract
;; Handles secure disbursement of funds

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map escrows
  { escrow-id: (string-ascii 36) }
  {
    project-id: (string-ascii 36),
    client: principal,
    contractor: principal,
    total-amount: uint,
    released-amount: uint,
    status: (string-ascii 20)
  }
)

(define-map payments
  {
    escrow-id: (string-ascii 36),
    payment-id: (string-ascii 36)
  }
  {
    milestone-id: (string-ascii 36),
    amount: uint,
    status: (string-ascii 20),
    release-date: uint
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_ALREADY_EXISTS u101)
(define-constant ERR_NOT_FOUND u102)
(define-constant ERR_INSUFFICIENT_FUNDS u103)
(define-constant ERR_INVALID_STATE u104)

;; Read-only functions
(define-read-only (get-escrow (escrow-id (string-ascii 36)))
  (map-get? escrows { escrow-id: escrow-id })
)

(define-read-only (get-payment (escrow-id (string-ascii 36)) (payment-id (string-ascii 36)))
  (map-get? payments { escrow-id: escrow-id, payment-id: payment-id })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

(define-read-only (is-escrow-client (escrow-id (string-ascii 36)))
  (match (get-escrow escrow-id)
    escrow (is-eq tx-sender (get client escrow))
    false
  )
)

(define-read-only (is-escrow-contractor (escrow-id (string-ascii 36)))
  (match (get-escrow escrow-id)
    escrow (is-eq tx-sender (get contractor escrow))
    false
  )
)

;; Public functions
(define-public (create-escrow
    (escrow-id (string-ascii 36))
    (project-id (string-ascii 36))
    (contractor principal)
    (total-amount uint)
  )
  (let ((existing-escrow (get-escrow escrow-id)))
    (asserts! (is-none existing-escrow) (err ERR_ALREADY_EXISTS))

    (ok (map-set escrows
      { escrow-id: escrow-id }
      {
        project-id: project-id,
        client: tx-sender,
        contractor: contractor,
        total-amount: total-amount,
        released-amount: u0,
        status: "active"
      }
    ))
  )
)

(define-public (add-payment
    (escrow-id (string-ascii 36))
    (payment-id (string-ascii 36))
    (milestone-id (string-ascii 36))
    (amount uint)
  )
  (begin
    (asserts! (or (is-escrow-client escrow-id) (is-admin)) (err ERR_UNAUTHORIZED))

    (match (get-escrow escrow-id)
      escrow (begin
        (asserts! (is-eq (get status escrow) "active") (err ERR_INVALID_STATE))

        (ok (map-set payments
          { escrow-id: escrow-id, payment-id: payment-id }
          {
            milestone-id: milestone-id,
            amount: amount,
            status: "pending",
            release-date: u0
          }
        ))
      )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (release-payment
    (escrow-id (string-ascii 36))
    (payment-id (string-ascii 36))
  )
  (begin
    (asserts! (or (is-escrow-client escrow-id) (is-admin)) (err ERR_UNAUTHORIZED))

    (match (get-payment escrow-id payment-id)
      payment (begin
        (match (get-escrow escrow-id)
          escrow (begin
            (asserts! (is-eq (get status escrow) "active") (err ERR_INVALID_STATE))
            (asserts! (is-eq (get status payment) "pending") (err ERR_INVALID_STATE))

            ;; Update payment status
            (map-set payments
              { escrow-id: escrow-id, payment-id: payment-id }
              (merge payment {
                status: "released",
                release-date: block-height
              })
            )

            ;; Update escrow released amount
            (ok (map-set escrows
              { escrow-id: escrow-id }
              (merge escrow {
                released-amount: (+ (get released-amount escrow) (get amount payment))
              })
            ))
          )
          (err ERR_NOT_FOUND)
        )
      )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (close-escrow (escrow-id (string-ascii 36)))
  (begin
    (asserts! (or (is-escrow-client escrow-id) (is-admin)) (err ERR_UNAUTHORIZED))

    (match (get-escrow escrow-id)
      escrow (begin
        (asserts! (is-eq (get status escrow) "active") (err ERR_INVALID_STATE))

        (ok (map-set escrows
          { escrow-id: escrow-id }
          (merge escrow { status: "closed" })
        ))
      )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (dispute-escrow (escrow-id (string-ascii 36)))
  (begin
    (asserts! (or (is-escrow-client escrow-id) (is-escrow-contractor escrow-id)) (err ERR_UNAUTHORIZED))

    (match (get-escrow escrow-id)
      escrow (begin
        (asserts! (is-eq (get status escrow) "active") (err ERR_INVALID_STATE))

        (ok (map-set escrows
          { escrow-id: escrow-id }
          (merge escrow { status: "disputed" })
        ))
      )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (resolve-dispute
    (escrow-id (string-ascii 36))
    (new-status (string-ascii 20))
  )
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (match (get-escrow escrow-id)
      escrow (begin
        (asserts! (is-eq (get status escrow) "disputed") (err ERR_INVALID_STATE))

        (ok (map-set escrows
          { escrow-id: escrow-id }
          (merge escrow { status: new-status })
        ))
      )
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
