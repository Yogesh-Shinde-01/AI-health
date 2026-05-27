interface LoadingSpinnerProps {
  size?: number
  className?: string
}

const LoadingSpinner = ({ size = 24, className = '' }: LoadingSpinnerProps) => (
  <div className={`flex items-center justify-center ${className}`}>
    <span
      className="animate-spin rounded-full border-4 border-primary/20 border-t-primary"
      style={{ width: size, height: size }}
    />
  </div>
)

export default LoadingSpinner
