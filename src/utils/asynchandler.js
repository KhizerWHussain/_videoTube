// const handlerAsync = async (requestHandler) => {
//   return (req, res, next) => {
//     Promise.resolve(requestHandler(req, res, next)).catch((error) => {
//       next(error);
//     });
//   };
// };

// export { handlerAsync };

const handlerAsync = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => {
      next(error); // Properly forward errors to Express's error-handling middleware
    });
  };
};

export { handlerAsync };
